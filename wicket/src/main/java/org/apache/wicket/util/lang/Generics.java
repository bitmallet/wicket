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
package org.apache.wicket.util.lang;

import java.util.HashMap;
import java.util.Iterator;

import org.apache.wicket.model.IModel;
import org.apache.wicket.model.Model;

/**
 * Generics related utilities
 * 
 * @author igor.vaynberg
 */
public class Generics
{
	private Generics()
	{

	}

	/**
	 * Silences generics warning when need to cast iterator types
	 * 
	 * @param <T>
	 * @param delegate
	 * @return <code>delegate</code> iterator cast to proper generics type
	 */
	@SuppressWarnings("unchecked")
	public static <T> Iterator<T> iterator(Iterator< ? > delegate)
	{
		return (Iterator<T>)delegate;
	}

	/**
	 * Supresses generics warning when converting model types
	 * 
	 * @param <T>
	 * @param model
	 * @return <code>model</code>
	 */
	@SuppressWarnings("unchecked")
	public static <T> IModel<T> model(Model< ? > model)
	{
		return (IModel<T>)model;
	}

	/**
	 * Creates a new HashMap
	 * 
	 * @param <K>
	 * @param <V>
	 * @return
	 */
	public static <K, V> HashMap<K, V> newHashMap()
	{
		return new HashMap<K, V>();
	}

}