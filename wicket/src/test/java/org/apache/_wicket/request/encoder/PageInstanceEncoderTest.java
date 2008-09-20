/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache._wicket.request.encoder;

import org.apache._wicket.IComponent;
import org.apache._wicket.MockPage;
import org.apache._wicket.request.RequestHandler;
import org.apache._wicket.request.Url;
import org.apache._wicket.request.handler.impl.ListenerInterfaceRequestHandler;
import org.apache._wicket.request.handler.impl.RenderPageRequestHandler;
import org.apache.wicket.markup.html.link.ILinkListener;

/**
 * 
 * @author Matej Knopp
 */
public class PageInstanceEncoderTest extends AbstractEncoderTest
{

	/**
	 * 
	 * Construct.
	 */
	public PageInstanceEncoderTest()
	{
	}

	private PageInstanceEncoder encoder = new PageInstanceEncoder()
	{
		@Override
		protected EncoderContext getContext()
		{
			return context;
		}
	};
		
	/**
	 * 
	 */
	public void testDecode1()
	{
		Url url = Url.parse("wicket/page?4");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertTrue(handler instanceof RenderPageRequestHandler);
		
		RenderPageRequestHandler h = (RenderPageRequestHandler) handler;
		checkPage(h.getPage(), 4, 0, null); 	
	}
	
	/**
	 * 
	 */
	public void testDecode2()
	{
		Url url = Url.parse("wicket/page?4.5");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertTrue(handler instanceof RenderPageRequestHandler);
		
		RenderPageRequestHandler h = (RenderPageRequestHandler) handler;
		checkPage(h.getPage(), 4, 5, null); 	
	}
	
	/**
	 * 
	 */
	public void testDecode3()
	{
		Url url = Url.parse("wicket/page/ingore/me?abc.4.5&a=3&b=3");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertTrue(handler instanceof RenderPageRequestHandler);
		
		RenderPageRequestHandler h = (RenderPageRequestHandler) handler;
		checkPage(h.getPage(), 4, 5, "abc"); 	
	}
	
	/**
	 * 
	 */
	public void testDecode4()
	{
		Url url = Url.parse("wicket/page?abc.4.5-ILinkListener-a-b-c");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertTrue(handler instanceof ListenerInterfaceRequestHandler);
		
		ListenerInterfaceRequestHandler h = (ListenerInterfaceRequestHandler) handler;
		checkPage(h.getPage(), 4, 5, "abc"); 	
		assertEquals(h.getComponent().getPath(), "a:b:c");
		assertEquals(ILinkListener.INTERFACE, h.getListenerInterface());
		assertNull(h.getBehaviorIndex());
	}
	
	/**
	 * 
	 */
	public void testDecode5()
	{
		Url url = Url.parse("wickett/pagee?abc.4.5-ILinkListener-a:b-c");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertNull(handler);
	}
	
	/**
	 * 
	 */
	public void testDecode6()
	{
		Url url = Url.parse("wicket/page?abc");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertNull(handler);
	}
	
	/**
	 * 
	 */
	public void testDecode7()
	{
		Url url = Url.parse("wicket/page?abc.4.5-ILinkListener.5-a-b-c");
		
		RequestHandler handler = encoder.decode(getRequest(url));
		assertTrue(handler instanceof ListenerInterfaceRequestHandler);
		
		ListenerInterfaceRequestHandler h = (ListenerInterfaceRequestHandler) handler;
		checkPage(h.getPage(), 4, 5, "abc"); 	
		assertEquals(h.getComponent().getPath(), "a:b:c");
		assertEquals(ILinkListener.INTERFACE, h.getListenerInterface());
		assertEquals((Object)5, h.getBehaviorIndex());
	}
	
	/**
	 * 
	 */
	public void testEncode1()
	{
		MockPage page = new MockPage(15, 4, "pm1");
		RequestHandler handler = new RenderPageRequestHandler(page);
		
		Url url = encoder.encode(handler);
		assertEquals("wicket/page?pm1.15.4", url.toString());
	}
	
	/**
	 * 
	 */
	public void testEncode2()
	{
		MockPage page = new MockPage(15, 0, null);
		RequestHandler handler = new RenderPageRequestHandler(page);
		
		Url url = encoder.encode(handler);
		assertEquals("wicket/page?15", url.toString());
	}
	
	/**
	 * 
	 */
	public void testEncode3()
	{
		MockPage page = new MockPage(15, 0, null);
		
		IComponent c = page.get("a:b:c");
		
		RequestHandler handler = new ListenerInterfaceRequestHandler(page, c, ILinkListener.INTERFACE);
		
		Url url = encoder.encode(handler);
		assertEquals("wicket/page?15-ILinkListener-a-b-c", url.toString());
	}
	
	/**
	 * 
	 */
	public void testEncode4()
	{
		MockPage page = new MockPage(15, 0, null);
		
		IComponent c = page.get("a:b:c");
		
		RequestHandler handler = new ListenerInterfaceRequestHandler(page, c, ILinkListener.INTERFACE, 5);
		
		Url url = encoder.encode(handler);
		assertEquals("wicket/page?15-ILinkListener.5-a-b-c", url.toString());
	}	
}